import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // @ts-expect-error: defaultSsr flag is honored by the runtime
    defaultSsr: false,
    defaultErrorComponent: ({ error }) => {
      console.error(error);
      return null;
    },
  });

  return router;
};
