import mongoose from 'mongoose';
import type { ConnectOptions } from 'mongoose';
const MONGODB_URI = process.env.MONGODB_URI as string | undefined;

interface Cached {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

let cached: Cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

let mongoAvailable = false;
let lastFailureAt = 0;
const FAILURE_COOLDOWN_MS = 60_000; // 1 minute cooldown to avoid repeated slow retries

export function isMongoAvailable() {
    return mongoAvailable;
}

async function connectDB() {
    if (!MONGODB_URI) {
        console.warn('MONGODB_URI not provided — falling back to file-based storage');
        mongoAvailable = false;
        return null;
    }

    // If we recently failed to connect, skip attempting again for a short cooldown
    if (lastFailureAt && (Date.now() - lastFailureAt) < FAILURE_COOLDOWN_MS) {
        return null;
    }

    if (cached.conn) {
        mongoAvailable = true;
        return cached.conn;
    }

    if (!cached.promise) {
        const opts: ConnectOptions = {
            // Allow mongoose to buffer commands until the connection is established
            bufferCommands: true,
            // Fail fast when the MongoDB server is unreachable to avoid long blocking delays
            serverSelectionTimeoutMS: 2000,
            connectTimeoutMS: 2000,
            // other mongoose options can be added here
        } as ConnectOptions;

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('MongoDB connected successfully');
            mongoAvailable = true;
            return mongoose;
        }).catch((err) => {
            console.error('MongoDB connection failed:', err);
            mongoAvailable = false;
            lastFailureAt = Date.now();
            // Reset promise so future attempts can retry after cooldown
            cached.promise = null;
            return null as any;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        mongoAvailable = false;
        lastFailureAt = Date.now();
        return null;
    }

    return cached.conn;
}

export default connectDB;
