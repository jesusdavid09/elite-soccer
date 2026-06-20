export interface User {
    id: number;
    email: string;
    password_hash: string;
    full_name: string;
    role: 'player' | 'coach' | 'admin';
    approved: boolean;
    created_at: Date;
    updated_at?: Date;
}

export interface UserCreate {
    email: string;
    password: string;
    full_name: string;
    role: 'player' | 'coach' | 'admin';
}

export interface UserLogin {
    email: string;
    password: string;
}

export interface UserSession {
    id: number;
    email: string;
    full_name: string;
    role: 'player' | 'coach' | 'admin';
    approved: boolean;
}