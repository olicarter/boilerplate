import { createContext, useContext } from 'react';
import type { User } from './api';

export const UserContext = createContext<User | null>(null);
export const useCurrentUser = () => useContext(UserContext);
