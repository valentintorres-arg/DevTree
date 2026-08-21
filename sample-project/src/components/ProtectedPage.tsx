import { withAuth } from "third-party-auth";
import { Page } from "./Page";

export const ProtectedPage = withAuth(Page);
