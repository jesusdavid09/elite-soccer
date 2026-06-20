import { User } from './user';

export interface Announcement {
    id: number;
    title: string;
    content: string;
    author_id: number;
    author?: User;
    created_at: Date;
    updated_at?: Date;
}

export interface AnnouncementCreate {
    title: string;
    content: string;
}

export interface AnnouncementUpdate {
    title?: string;
    content?: string;
}

export interface AnnouncementWithAuthor extends Announcement {
    author_name: string;
}