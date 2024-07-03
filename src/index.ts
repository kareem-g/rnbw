import { TOsType, TTheme } from "@_redux/global";
import { toast } from "react-toastify";
import MainPage from "./indexTSX"; 
import ActionsPanel from "./sidebarView";
import CodeView from "./codeView";
import StageView from "./stageView";
import App from "./indexTSX";

export const isChromeOrEdge = (): boolean => {
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf("Chrome") > -1) {
    return true;
  } else if (userAgent.indexOf("Edg") > -1) {
    return true;
  }
  return false;
};

export const getCommandKey = (
  e: KeyboardEvent | MouseEvent | React.MouseEvent,
  osType: TOsType,
): boolean => {
  return osType === "Windows"
    ? e.ctrlKey
    : osType === "Mac"
    ? e.metaKey
    : osType === "Linux"
    ? e.ctrlKey
    : false;
};

export const getSystemTheme = (): TTheme => {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "Dark";
  } else {
    return "Light";
  }
};

export const addClass = (classList: string, classToAdd: string): string => {
  const validClassList = classList
    .split(" ")
    .filter((_class) => !!_class && _class !== classToAdd)
    .join(" ");
  return `${validClassList} ${classToAdd}`;
};

export const removeClass = (
  classList: string,
  classToRemove: string,
): string => {
  const validClassList = classList
    .split(" ")
    .filter((_class) => !!_class && _class !== classToRemove)
    .join(" ");
  return validClassList;
};

export const generateQuerySelector = (path: string): string => {
  return path.replace(/[^A-Za-z]/g, (c) => c.charCodeAt(0).toString());
};

export const verifyFileHandlerPermission = async (
  fileHandle: FileSystemHandle,
): Promise<boolean> => {
  if (fileHandle === undefined) return false;

  try {
    const opts: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };
    if ((await fileHandle.queryPermission(opts)) === "granted") return true;

    if ((await fileHandle.requestPermission(opts)) === "granted") return true;

    return false;
  } catch (err) {
    toast.error("An error occurred while verifying file handler permission");
    return false;
  }
};

export default App;
export * from "./types";
export { MainPage, ActionsPanel, CodeView, StageView };