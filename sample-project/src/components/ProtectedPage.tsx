import { withAuth } from "../hocs/withAuth";
import { Page } from "./Page";

export const ProtectedPage = withAuth(Page);
