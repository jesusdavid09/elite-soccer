import { User } from './user';

export interface Match {
    id: number;
    opponent: string;
    competition: string;
    date: Date;
    time: string;
    location: string;
    home_team: boolean;
    result_home: number | null;
    result_away: number | null;
    created_by: number;
    created_by_user?: User;
    created_at: Date;
    updated_at?: Date;
}

export interface MatchCreate {
    opponent: string;
    competition: string;
    date: Date;
    time: string;
    location: string;
    home_team: boolean;
}

export interface MatchUpdate {
    opponent?: string;
    competition?: string;
    date?: Date;
    time?: string;
    location?: string;
    home_team?: boolean;
    result_home?: number;
    result_away?: number;
}

export interface MatchWithAuthor extends Match {
    created_by_name: string;
}