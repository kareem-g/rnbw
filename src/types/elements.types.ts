import { TNodeUid } from "@_node/index";

interface Iadd {
  tagName: string;
  attributes: string;
  skipUpdate?: boolean;
}

interface Iduplicate {
  skipUpdate?: boolean;
}
interface IupdateSettings {
  settings: {
    [key: string]: string;
  };
  skipUpdate?: boolean;
}

interface Icopy {
  uids?: TNodeUid[];
  skipUpdate?: boolean;
}
interface Ipaste {
  targetUid?: TNodeUid;
  content?: string;
  pasteContent?: string;
  pastePosition?: "before" | "after" | "inside";
  skipUpdate?: boolean;
}
interface Iremove {
  uids?: TNodeUid[];
  skipUpdate?: boolean;
  content?: string;
}
interface Imove {
  selectedUids: TNodeUid[];
  targetUid: TNodeUid;
  isBetween: boolean;
  position: number;
  skipUpdate?: boolean;
}

export { Iadd, Iduplicate, IupdateSettings, Icopy, Ipaste, Iremove, Imove };
