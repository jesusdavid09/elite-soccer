export interface Attendance {
    id: number;
    player_id: number;
    event_id: number;
    event_type: 'training' | 'match';
    status: 'yes' | 'maybe' | 'no';
    justification: string | null;
    created_at: Date;
    updated_at?: Date;
}

export interface AttendanceCreate {
    player_id: number;
    event_id: number;
    event_type: 'training' | 'match';
    status: 'yes' | 'maybe' | 'no';
    justification?: string;
}

export interface AttendanceWithPlayer extends Attendance {
    player_name: string;
    jersey_number: number;
}