import express from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import {CreateRoomSchema, CreateUserSchema, SigninSchema} from "@repo/common/types"
import { prismaClient } from "@repo/db/client"
import bcrypt from "bcrypt"
import cors from "cors"

const app = express();
app.use(express.json())
app.use(cors())

app.post("/signup", async (req, res) => {

    // checking if data entered by user is correct or not
    const parsedData = CreateUserSchema.safeParse(req.body)
    if(!parsedData.success) {
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }
    // db call
    try {
            // hashing the password
        const hashedPassword = await bcrypt.hash(parsedData.data.password, 5)

        const user = await prismaClient.user.create({
            data: {
                email: parsedData.data?.username,
                password: hashedPassword,
                name: parsedData.data.name
            }
        })
    
        res.json({
            userId: user.id
        })
    } catch (e) {
        res.status(411).json({
            message: "User already exist with this username"
        })
    }
    
})

app.post("/signin", async (req, res) => {

    const parsedData = SigninSchema.safeParse(req.body);
    if(!parsedData.success) {
        res.json({
            message: "Incorrect Input"
        })
        return;
    }
        const user = await prismaClient.user.findFirst({
            where: {
                email: parsedData.data.username,
            }
        })

        if (!user) {
            res.status(403).json({
                message: "User not found"
            })
            return;
        }

        // Comparing the hashed passwords
        const comparePassword = await bcrypt.compare(parsedData.data.password, user?.password)

        if (!comparePassword) {
            res.status(403).json({
                message: "Incorrect password",
            });
            return;
        }
    const token = jwt.sign({
        userId: user?.id
    }, JWT_SECRET)

    res.json({
        token
    })
})

app.post("/room", middleware, async (req, res) => {

    const parsedData = CreateRoomSchema.safeParse(req.body);

    if(!parsedData.success) {
        res.json({
            message: "Incorrect Inputs"
        })
        return;
    }

    const userId = req.userId;

    if (!userId) {
        res.status(400).json({
            message: "User ID is missing"
        });
        return;
    }    
    // db call
    try {
        const room = await prismaClient.room.create({
            data: {
                slug: parsedData.data.name,
                adminId: userId
            }
        })
    
        res.json({
            roomId: room.id
        })
    } catch (e) {
        res.status(411).json({
            message: "Room already exist with this name"
        })
    }
})

app.get("/chats/:roomId", async(req, res) => {
    //db call
    try {
        const roomId = Number(req.params.roomId);
        const messages = await prismaClient.chat.findMany({
            where: {
                roomId: roomId
            },
            orderBy: {
                id: "desc"
            },
            take: 50
        })

        res.json({
            messages
        })
    } catch (e) {
        res.status(411).json({
            message: []
        })
    }
})

app.get("/room/:slug", async(req, res) => {
    const slug = req.params.slug;

    //db call
    try {
        const room = await prismaClient.room.findFirst({
            where: {
                slug
            }
        });

        res.json({
            room
        })
    } catch (e) {
        res.status(411).json({
            message: "Error Getting Slug"
        });
    };
});

app.listen(3001)