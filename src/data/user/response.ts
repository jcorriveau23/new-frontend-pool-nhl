
import { UserData } from "./model";

export interface LoginResponse {
    user: UserData;
    token: string;
}


export interface Response {
    data: string
}

export interface ErrorResponse {
    response: Response;
}