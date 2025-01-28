import { FileSystemFileHandle } from "file-system-access";

import { verifyFileHandlerPermission } from "../../rnbw";

import {
  TFileHandlerCollection,
  TFileNodeData,
  TFileNodeTreeData,
  TNodeUid,
  getTargetHandler,
} from "../";
import {
  _createIDBDirectory,
  _getIDBDirectoryOrFileStat,
  _path,
  _readIDBDirectory,
  _readIDBFile,
  _removeIDBDirectoryOrFile,
  _writeIDBFile,
} from "./nohostApis";
import { useDispatch } from "react-redux";
import { addToast } from "@src/_redux/main/toasts";

// true: success, false: fail
const createLocalSingleDirectoryOrFile = async ({
  parentUid,
  name,
  kind,
  fileTree,
  fileHandlers,
}: {
  parentUid: TNodeUid;
  name: string;
  kind: "file" | "directory";
  fileTree: TFileNodeTreeData;
  fileHandlers: TFileHandlerCollection;
}): Promise<boolean> => {
  const dispatch = useDispatch();

  const parentNode = fileTree[parentUid];
  if (!parentNode) return false;

  const parentHandler = fileHandlers[parentUid] as FileSystemDirectoryHandle;
  if (!(await verifyFileHandlerPermission(parentHandler))) return false;

  try {
    if (kind === "directory") {
      await parentHandler.getDirectoryHandle(name, { create: true });
    } else {
      await parentHandler.getFileHandle(name, { create: true });
    }
    return true;
  } catch (err) {

          
    dispatch(
      addToast({
        title: "Error",
        message: "Error while creating a local directory or file.",
        type: "danger"
      })
    );

    return false;
  }
};
const createIDBSingleDirectoryOrFile = async ({
  parentUid,
  name,
  kind,
  fileTree,
}: {
  parentUid: TNodeUid;
  name: string;
  kind: "file" | "directory";
  fileTree: TFileNodeTreeData;
}): Promise<boolean> => {
  const dispatch = useDispatch();

  const parentNode = fileTree[parentUid];
  if (!parentNode) return false;

  const parentNodeData = parentNode.data;
  try {
    if (kind === "directory") {
      await _createIDBDirectory(_path.join(parentNodeData.path, name));
    } else {
      await _writeIDBFile(_path.join(parentNodeData.path, name), "");
    }
    return true;
  } catch (err) {

    dispatch(
      addToast({
        title: "Error",
        message: "Error while creating an idb directory or file.",
        type: "danger"
      })
    );

    return false;
  }
};

export const removeSingleLocalDirectoryOrFile = async ({
  uid,
  fileTree,
  fileHandlers,
}: {
  uid: TNodeUid;
  fileTree: TFileNodeTreeData;
  fileHandlers: TFileHandlerCollection;
}): Promise<boolean> => {
  const node = fileTree[uid];
  if (!node) return false;

  const parentNode = fileTree[node.parentUid!];
  if (!parentNode) return false;

  const parentHandler = fileHandlers[
    parentNode.uid
  ] as FileSystemDirectoryHandle;
  if (!(await verifyFileHandlerPermission(parentHandler))) return false;

  const nodeData = node.data;
  try {
    const entryName =
      nodeData.kind === "directory"
        ? nodeData.name
        : nodeData.ext
          ? `${nodeData.name}.${nodeData.ext}`
          : `${nodeData.name}`;

    await parentHandler.removeEntry(entryName, { recursive: true });
    return true;
  } catch (err) {
    const dispatch = useDispatch();

    dispatch(
      addToast({
        title: "Error",
        message: "Error while removing a local directory or file.",
        type: "danger"
      })
    );

    return false;
  }
};
export const removeSingleIDBDirectoryOrFile = async ({
  uid,
  fileTree,
}: {
  uid: TNodeUid;
  fileTree: TFileNodeTreeData;
}): Promise<boolean> => {
  const dispatch = useDispatch();

  const node = fileTree[uid];
  if (!node) return false;

  const parentNode = fileTree[node.parentUid!];
  if (!parentNode) return false;

  const nodeData = node.data;
  const parentNodeData = parentNode.data;
  try {
    const entryName =
      nodeData.kind === "directory"
        ? nodeData.name
        : `${nodeData.name}.${nodeData.ext}`;
    await _removeIDBDirectoryOrFile(_path.join(parentNodeData.path, entryName));
    return true;
  } catch (err) {
    dispatch(
      addToast({
        title: "Error",
        message: "Error while removing an idb directory or file.",
        type: "danger"
      })
    );


    return false;
  }
};

const _moveLocalDirectory = async (
  source: FileSystemDirectoryHandle,
  destination: FileSystemDirectoryHandle,
  parentHandler: FileSystemDirectoryHandle,
  isCopy: boolean,
) => {
  const dispatch = useDispatch();

  const dirQueue = [
    {
      source,
      destination,
    },
  ];

  try {
    while (dirQueue.length) {
      const { source, destination } = dirQueue.shift() as {
        source: FileSystemDirectoryHandle;
        destination: FileSystemDirectoryHandle;
      };

      for await (const entry of source.values()) {
        if (entry.kind === "directory") {
          const newDir = await destination.getDirectoryHandle(entry.name, {
            create: true,
          });
          dirQueue.push({
            source: entry as FileSystemDirectoryHandle,
            destination: newDir,
          });
        } else {
          const newFile = await destination.getFileHandle(entry.name, {
            create: true,
          });
          const content = await (entry as FileSystemFileHandle).getFile();
          const writableStream = await newFile.createWritable();
          await writableStream.write(content);
          await writableStream.close();
        }
      }
    }
    if (!isCopy) {
      try {
        parentHandler.removeEntry(source.name, { recursive: true });
      } catch (err) {
        dispatch(
          addToast({
            title: "Error",
            message: "Error while moving a local directory.",
            type: "danger"
          })
        );
        console.error(err);
      }
    }
  } catch (err) {
    dispatch(
      addToast({
        title: "Error",
        message: "Error while moving a local directory.",
        type: "danger"
      })
    );
    console.error(err);
  }
};
const _moveLocalFile = async (
  handler: FileSystemHandle,
  parentHandler: FileSystemDirectoryHandle,
  targetHandler: FileSystemDirectoryHandle,
  newName: string,
  isCopy: boolean,
) => {
  const dispatch = useDispatch();

  try {
    const newFile = await targetHandler.getFileHandle(newName, {
      create: true,
    });

    const content = await (handler as FileSystemFileHandle).getFile();
    const writableStream = await newFile.createWritable();
    await writableStream.write(content);
    await writableStream.close();

    !isCopy &&
      (await parentHandler.removeEntry(handler.name, { recursive: true }));
  } catch (err) {
    dispatch(
      addToast({
        title: "Error",
        message: "Error while moving a local file.",
        type: "danger"
      })
    );
    throw "Error while moving a local file.";
  }
};
export const moveLocalSingleDirectoryOrFile = async ({
  uid,
  targetUid,
  newName,
  fileTree,
  fileHandlers,
  isCopy = false,
}: {
  uid: TNodeUid;
  targetUid: TNodeUid;
  newName?: string;
  fileTree: TFileNodeTreeData;
  fileHandlers: TFileHandlerCollection;
  isCopy?: boolean;
}): Promise<boolean> => {
  /* We check if the source node, target node,
  and the parent node of the source node exist.
  */

  const node = fileTree[uid];
  if (!node) return false;

  const parentNode = fileTree[node.parentUid!];
  if (!parentNode) return false;

  const targetNode = fileTree[targetUid];
  if (!targetNode) return false;

  /*
  We verify the permissions of the source node,
  the parent node of the source node, and the target node.
  */
  const handler = fileHandlers[uid];
  const parentUid = parentNode.uid;
  const parentHandler = fileHandlers[parentUid] as FileSystemDirectoryHandle;
  const targetHandler = getTargetHandler({ targetUid, fileTree, fileHandlers });
  try {
    const dispatch = useDispatch();

    if (
      !(await verifyFileHandlerPermission(handler)) ||
      !(await verifyFileHandlerPermission(parentHandler)) ||
      !(await verifyFileHandlerPermission(targetHandler))
    )
      return false;

    const nodeData = node.data;

    let uniqueEntityName = newName || nodeData.name;
    if (isCopy) {
      uniqueEntityName = await generateNewNameForLocalDirectoryOrFile({
        nodeData,
        targetHandler,
      });
    } else {
      //ignore paste for cut in the same location
      if (targetNode.isEntity) {
        if (targetNode.parentUid === parentNode.uid) {
          return false;
        }
      }
    }

    if (nodeData.kind === "directory") {
      try {
        const newHandler = await targetHandler.getDirectoryHandle(
          uniqueEntityName,
          {
            create: true,
          },
        );
        await _moveLocalDirectory(
          handler as FileSystemDirectoryHandle,
          newHandler,
          parentHandler,
          isCopy,
        );
      } catch (err) {
        dispatch(
          addToast({
            title: "Error",
            message: "Error while moving a local directory.",
            type: "danger"
          })
        );
        console.log(err);
      }
    } else {
      try {
        await _moveLocalFile(
          handler as FileSystemFileHandle,
          parentHandler,
          targetHandler,
          uniqueEntityName,
          isCopy,
        );
      } catch (err) {
        dispatch(
          addToast({
            title: "Error",
            message: "Error while moving a local file.",
            type: "danger"
          })
        );
        console.log(err);
      }
    }
    return true;
  } catch (err) {
    const dispatch = useDispatch();

    dispatch(
      addToast({
        title: "Error",
        message: "Error while moving a local directory or file.",
        type: "danger"
      })
    );
    console.error(err);
    return false;
  }
};
const _moveIDBDirectory = async (
  nodeData: TFileNodeData,
  targetNodeData: TFileNodeData,
  newName: string,
  isCopy: boolean,
) => {
  const dirQueue = [
    {
      orgPath: nodeData.path,
      newPath: _path.join(targetNodeData.path, newName),
    },
  ];
  try {
    while (dirQueue.length) {
      const { orgPath, newPath } = dirQueue.shift() as {
        orgPath: string;
        newPath: string;
      };
      await _createIDBDirectory(newPath);

      const entries = await _readIDBDirectory(orgPath);
      await Promise.all(
        entries.map(async (entry) => {
          const c_orgPath = _path.join(orgPath, entry);
          const c_newPath = _path.join(newPath, entry);
          const stats = await _getIDBDirectoryOrFileStat(c_orgPath);
          const c_kind = stats.type === "DIRECTORY" ? "directory" : "file";
          if (c_kind === "directory") {
            dirQueue.push({ orgPath: c_orgPath, newPath: c_newPath });
          } else {
            await _writeIDBFile(c_newPath, await _readIDBFile(c_orgPath));
          }
        }),
      );
    }

    !isCopy && (await _removeIDBDirectoryOrFile(nodeData.path));
  } catch (err) {
    const dispatch = useDispatch();

    dispatch(
      addToast({
        title: "Error",
        message: "Error while moving an idb directory.",
        type: "danger"
      })
    );
    throw "Error while moving an idb directory.";
  }
};
const _moveIDBFile = async (
  nodeData: TFileNodeData,
  targetNodeData: TFileNodeData,
  newName: string,
  isCopy: boolean,
) => {
  try {
    await _writeIDBFile(
      _path.join(targetNodeData.path, newName),
      await _readIDBFile(nodeData.path),
    );

    !isCopy && (await _removeIDBDirectoryOrFile(nodeData.path));
  } catch (err) {
    const dispatch = useDispatch();

    dispatch(
      addToast({
        title: "Error",
        message: "Error while moving an idb file.",
        type: "danger"
      })
    );

    throw "Error while moving an idb file.";
  }
};
export const moveIDBSingleDirectoryOrFile = async ({
  uid,
  targetUid,
  newName,
  fileTree,
  isCopy,
}: {
  uid: TNodeUid;
  targetUid: TNodeUid;
  newName: string;
  fileTree: TFileNodeTreeData;
  isCopy: boolean;
}): Promise<boolean> => {
  const node = fileTree[uid];
  if (!node) return false;

  const targetNode = fileTree[targetUid];
  if (!targetNode) return false;

  const nodeData = node.data;
  const targetNodeData = targetNode.data;

  const uniqueEntityName =
    newName || `${nodeData.name}${nodeData.ext ? `.${nodeData.ext}` : ""}`;

  if (uid === `${targetUid}/${uniqueEntityName}`) return false;
  try {
    if (nodeData.kind === "directory") {
      await _moveIDBDirectory(nodeData, targetNodeData, newName, isCopy);
    } else {
      await _moveIDBFile(nodeData, targetNodeData, newName, isCopy);
    }
    return true;
  } catch (err) {
    const dispatch = useDispatch();

    dispatch(
      addToast({
        title: "Error",
        message: "Error while moving an idb directory or file.",
        type: "danger"
      })
    );
    return false;
  }
};

const generateNewNameForLocalDirectoryOrFile = async ({
  nodeData,
  targetHandler,
}: {
  nodeData: TFileNodeData;
  targetHandler: FileSystemDirectoryHandle;
}): Promise<string> => {
  const { name, ext, kind } = nodeData;
  let newName = kind === "directory" ? name : `${name}.${ext}`;
  let exists = true;
  let index = -1;
  while (exists) {
    try {
      if (nodeData.kind === "directory") {
        await targetHandler.getDirectoryHandle(newName, { create: false });
      } else {
        await targetHandler.getFileHandle(newName, {
          create: false,
        });
      }
    } catch (err) {
      //@ts-expect-error - types are not updated
      if (err.name === "NotFoundError") {
        exists = false;
      } else {
        const dispatch = useDispatch();

        dispatch(
          addToast({
            title: "Error",
            message: "Error while generating a new name for a local directory.",
            type: "danger"
          })
        );
      }
    }

    if (exists) {
      ++index;
      newName =
        nodeData.kind === "directory"
          ? index === 0
            ? `${name} copy`
            : `${name} copy (${index})`
          : index === 0
            ? `${name} copy.${ext}`
            : `${name} copy (${index}).${ext}`;
    }
  }
  return newName;
};
export const generateNewNameForIDBDirectoryOrFile = async ({
  nodeData,
  targetNodeData,
}: {
  nodeData: TFileNodeData;
  targetNodeData: TFileNodeData;
}): Promise<string> => {
  const { name, ext, kind } = nodeData;
  let newName = kind === "directory" ? name : `${name}${ext ? `.${ext}` : ""}`;
  let exists = true;
  let index = -1;
  while (exists) {
    try {
      await _getIDBDirectoryOrFileStat(
        _path.join(targetNodeData.path as string, newName as string) as string,
      );
    } catch (err) {
      //@ts-expect-error - types are not updated
      if (err.name === "ENOENT") {
        exists = false;
      } else {
        const dispatch = useDispatch();

        dispatch(
          addToast({
            title: "Error",
            message: "Error while generating a new name for a IDB directory.",
            type: "danger"
          })
        );

      }
    }

    if (exists) {
      ++index;
      newName =
        nodeData.kind === "directory"
          ? index === 0
            ? `${name} copy`
            : `${name} copy (${index})`
          : index === 0
            ? `${name} copy${ext ? `.${ext}` : ""}`
            : `${name} copy (${index})${ext ? `.${ext}` : ""}`;
    }
  }
  return newName;
};

export const FileSystemApis = {
  local: {
    createSingleDirectoryOrFile: createLocalSingleDirectoryOrFile,
    removeSingleDirectoryOrFile: removeSingleLocalDirectoryOrFile,
    moveSingleDirectoryOrFile: moveLocalSingleDirectoryOrFile,
    generateNewName: generateNewNameForLocalDirectoryOrFile,
  },
  idb: {
    createSingleDirectoryOrFile: createIDBSingleDirectoryOrFile,
    removeSingleDirectoryOrFile: removeSingleIDBDirectoryOrFile,
    moveSingleDirectoryOrFile: moveIDBSingleDirectoryOrFile,
    generateNewName: generateNewNameForIDBDirectoryOrFile,
  },
};
