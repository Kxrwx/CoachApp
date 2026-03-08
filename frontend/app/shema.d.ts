//frontend/shema.d.ts

import { z } from "zod"

// -----------------------
// Regex et constantes
// -----------------------

// Email : stricte RFC 5322 simplifiée
const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/

// Mot de passe CNIL / OWASP (min 12, majuscule, minuscule, chiffre, symbole)
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{12,}$/


// -----------------------
// Schemas Zod
// -----------------------

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().regex(emailRegex, "Email invalide"),
  passwordHash: z.string(), // côté frontend, on ne manipule jamais le hash normalement
  mfaEnabled: z.boolean(),
})

export const PasswordSchema = z
  .string()
  .regex(
    passwordRegex,
    "Mot de passe invalide : min 12 caractères, majuscule, minuscule, chiffre, symbole"
  )

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deviceId: z.string().optional(),
  tokenHash: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
  lastSeen: z.string(),
  expiresAt: z.string(),
  revoked: z.boolean(),
})

export const DeviceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fingerprintHash: z.string(),
  deviceName: z.string().optional(),
  trusted: z.boolean(),
  trustedUntil: z.string().optional(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
})

// -----------------------
// Types TypeScript
// -----------------------

export type User = z.infer<typeof UserSchema>
export type Password = z.infer<typeof PasswordSchema>
export type Session = z.infer<typeof SessionSchema>
export type Device = z.infer<typeof DeviceSchema>

// -----------------------
// Window global helpers
// -----------------------
interface Window {
  __DEV__: boolean
}