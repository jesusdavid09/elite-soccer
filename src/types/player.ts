import { User } from './user';

export interface Player {
    id: number;
    user_id: number;
    user?: User;
    jersey_number: number;
    position: string;
    age: number | null;
    phone: string | null;
    photo_url: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: Date;
    updated_at?: Date;
}

export interface PlayerCreate {
    user_id: number;
    jersey_number: number;
    position: string;
    age?: number;
    phone?: string;
}

export interface PlayerUpdate {
    jersey_number?: number;
    position?: string;
    age?: number;
    phone?: string;
    photo_url?: string;
    status?: 'pending' | 'approved' | 'rejected';
}

export interface PlayerWithUser extends Player {
    full_name: string;
    email: string;
}