import { User } from './user';

export interface Training {
    id: number;
    title: string;
    description: string | null;
    date: Date;
    time: string;
    location: string;
    duration: number | null;
    created_by: number;
    created_by_user?: User;
    created_at: Date;
    updated_at?: Date;
}

export interface TrainingCreate {
    title: string;
    description?: string;
    date: Date;
    time: string;
    location: string;
    duration?: number;
}

export interface TrainingUpdate {
    title?: string;
    description?: string;
    date?: Date;
    time?: string;
    location?: string;
    duration?: number;
}

export interface TrainingWithAuthor extends Training {
    created_by_name: string;
}