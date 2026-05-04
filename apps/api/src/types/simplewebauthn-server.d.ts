declare module '@simplewebauthn/server' {
  export function generateRegistrationOptions(options: any): Promise<any>;
  export function verifyRegistrationResponse(options: any): Promise<any>;
  export function generateAuthenticationOptions(options: any): Promise<any>;
  export function verifyAuthenticationResponse(options: any): Promise<any>;
  export type AuthenticatorTransportFuture = string;
  export type RegistrationResponseJSON = any;
  export type AuthenticationResponseJSON = any;
}
