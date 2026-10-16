// Picks where data lives. With Supabase configured (EXPO_PUBLIC_SUPABASE_URL
// and EXPO_PUBLIC_SUPABASE_ANON_KEY) every call goes to the database through
// remote.js; without it the app runs on the local engine, which is how the
// demo and the tests work. Constants and rules always come from engine.js.

import { isRemote } from "@/lib/supabase";
import * as local from "./engine";
import * as remote from "./remote";

export { isRemote };

export const api = isRemote ? { ...local, ...remote } : local;
