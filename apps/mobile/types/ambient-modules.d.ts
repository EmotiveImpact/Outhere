declare module "@anythingai/app/utils" {
  export const errorFixEmitter: {
    emit: (event: string, payload?: unknown) => void;
  };

  export const ErrorFixEvents: {
    ERROR_FIX_SUBMITTED: string;
  };
}

declare module "@anythingai/app/screens/launcher-menu" {
  import type { ComponentType } from "react";
  const LauncherMenuContainer: ComponentType<any>;
  export default LauncherMenuContainer;
}

declare module "react-native-web-refresh-control" {
  import type { ComponentType } from "react";
  import type { RefreshControlProps } from "react-native";

  export const RefreshControl: ComponentType<RefreshControlProps>;
  const DefaultExport: ComponentType<RefreshControlProps>;
  export default DefaultExport;
}
