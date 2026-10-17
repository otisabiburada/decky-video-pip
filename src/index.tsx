import { definePlugin, routerHook } from "@decky/api";
import { staticClasses } from "@decky/ui";
import { FaYoutube } from "react-icons/fa";
import { startPolling, stopPolling } from "./backend";
import { PipHost } from "./host";
import { Panel } from "./panel";
import { pip } from "./view";

const GLOBAL_NAME = "YouTubePiP";

export default definePlugin(() => {
  startPolling();
  routerHook.addGlobalComponent(GLOBAL_NAME, () => <PipHost />);

  return {
    name: "YouTube PiP",
    titleView: <div className={staticClasses.Title}>YouTube PiP</div>,
    content: <Panel />,
    icon: <FaYoutube />,
    onDismount() {
      routerHook.removeGlobalComponent(GLOBAL_NAME);
      stopPolling();
      pip.destroy();
    },
  };
});
