import { z } from "zod";

export const CreateUserSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string(),
    // password: z.string()..regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/, "Password must be 8-16 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character, and must not contain spaces."),
    name: z.string().min(3).max(20)
})

export const SigninSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string()
})

export const CreateRoomSchema = z.object({
    name: z.string().min(3).max(20)
})