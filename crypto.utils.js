/**
 * SecureChat - AES-256-GCM Encryption Utilities
 * Menggunakan Web Crypto API untuk keamanan maksimal
 */

class SecureCrypto {
    constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        this.ALGORITHM = 'AES-GCM';
        this.KEY_LENGTH = 256;
        this.ITERATIONS = 100000;
        this.SALT_LENGTH = 16; // 128-bit
        this.IV_LENGTH = 12; // 96-bit untuk GCM
        this.HASH = 'SHA-256';
    }

    /**
     * Generate salt acak
     */
    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    }

    /**
     * Generate IV acak
     */
    generateIV() {
        return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    }

    /**
     * Derive key dari password menggunakan PBKDF2
     */
    async deriveKey(password, salt) {
        const passwordBuffer = this.encoder.encode(password);
        
        // Import password sebagai key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Derive key menggunakan PBKDF2
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.ITERATIONS,
                hash: this.HASH
            },
            keyMaterial,
            {
                name: this.ALGORITHM,
                length: this.KEY_LENGTH
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Enkripsi pesan dengan AES-256-GCM
     */
    async encrypt(plaintext, password) {
        try {
            // Generate salt dan IV
            const salt = this.generateSalt();
            const iv = this.generateIV();
            
            // Derive key
            const key = await this.deriveKey(password, salt);
            
            // Enkripsi
            const plaintextBuffer = this.encoder.encode(plaintext);
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.ALGORITHM,
                    iv: iv
                },
                key,
                plaintextBuffer
            );

            // Gabungkan: salt (16) + iv (12) + ciphertext
            const combined = new Uint8Array(
                salt.length + iv.length + new Uint8Array(encrypted).length
            );
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encrypted), salt.length + iv.length);

            // Encode ke Base64 untuk penyimpanan
            return this.arrayBufferToBase64(combined.buffer);
        } catch (error) {
            console.error('Enkripsi gagal:', error);
            throw new Error('Gagal mengenkripsi pesan');
        }
    }

    /**
     * Dekripsi pesan dengan AES-256-GCM
     */
    async decrypt(ciphertextBase64, password) {
        try {
            // Decode dari Base64
            const combined = this.base64ToArrayBuffer(ciphertextBase64);
            const combinedArray = new Uint8Array(combined);

            // Ekstrak salt, iv, dan ciphertext
            const salt = combinedArray.slice(0, this.SALT_LENGTH);
            const iv = combinedArray.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
            const ciphertext = combinedArray.slice(this.SALT_LENGTH + this.IV_LENGTH);

            // Derive key
            const key = await this.deriveKey(password, salt);

            // Dekripsi
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.ALGORITHM,
                    iv: iv
                },
                key,
                ciphertext
            );

            return this.decoder.decode(decrypted);
        } catch (error) {
            console.error('Dekripsi gagal:', error);
            throw new Error('Gagal mendekripsi pesan - Password mungkin salah');
        }
    }

    /**
     * Generate fingerprint untuk verifikasi
     */
    async generateFingerprint(password) {
        const salt = this.generateSalt();
        const key = await this.deriveKey(password, salt);
        const exported = await crypto.subtle.exportKey('raw', key);
        const hash = await crypto.subtle.digest('SHA-256', exported);
        const hashArray = new Uint8Array(hash);
        return this.arrayBufferToHex(hashArray.slice(0, 8));
    }

    /**
     * Helper: ArrayBuffer ke Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Helper: Base64 ke ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Helper: ArrayBuffer ke Hex
     */
    arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Validasi kekuatan password
     */
    validatePassword(password) {
        const checks = {
            length: password.length >= 12,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        const strength = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'][Math.min(score, 4)];

        return {
            valid: score >= 4,
            score: Math.min(score, 4),
            strength,
            checks
        };
    }
}

// Export singleton untuk digunakan global
const cryptoUtils = new SecureCrypto();