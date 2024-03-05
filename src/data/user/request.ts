
export interface RegisterRequest {
    name: string;
    password: string;
    email: string;
    phone: string;
}

export interface WalletLoginRegisterRequest {
    addr: string;
    sig: string;
}

export interface SocialLoginRequest {
    accessToken: string;
    data_access_expiration_time: number;
    expiresIn: number;
    graphDomain: string;
    signedRequest: string;
    userID: string;
}

export interface LoginRequest {
    name: string;
    password: string;
}

export interface SetUsernameRequest {
    new_username: string;
}

export interface SetPasswordRequest {
    password: string;
}
