import { ENVIRONMENT } from './environment';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            API_BASE_URL: string;
            WS_URL: string;
            ENVIRONMENT: ENVIRONMENT;
        }
    }
}
// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export { };
