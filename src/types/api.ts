export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    errors?: string[];
}

export interface PaginatedResponse<T = any> {
    data: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AuthResponse {
    token: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        role: string;
    };
}