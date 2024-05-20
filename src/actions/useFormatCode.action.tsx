import useRnbw from "@_services/useRnbw";
import { Range, editor } from "monaco-editor";

// helperModel added to update the code in the codeViewInstanceModel
// once when the action is executed, this improves the History Management
const helperModel = editor.createModel("", "html");

import { sortUidsByMaxEndIndex } from "@_components/main/actionsPanel/nodeTreeView/helpers";
import { useAppState } from "@_redux/useAppState";
import { useElementHelper } from "@_services/useElementHelper";

export default function useFormatCode() {
  const { validNodeTree } = useAppState();
  const { PrettyCode } = useElementHelper();

  const rnbw = useRnbw();
  async function formatCode() {
    const codeViewInstanceModel = rnbw.files.getEditorRef().current?.getModel();
    if (!codeViewInstanceModel) return;

    helperModel.setValue(codeViewInstanceModel.getValue());

    const selectedElements = rnbw.elements.getSelectedElements();
    const sortedUids = sortUidsByMaxEndIndex(selectedElements, validNodeTree);

    const edits = await Promise.all(
      sortedUids.map(async (uid) => {
        const node = rnbw.elements.getElement(uid);
        if (!node) return null;

        const { startLine, startCol, endLine, endCol } =
          node.data.sourceCodeLocation;
        const range = new Range(startLine, startCol, endLine, endCol);

        const text = await PrettyCode(
          codeViewInstanceModel.getValueInRange(range),
          startCol,
        );

        return { range, text };
      }),
    );

    edits.forEach((edit) => {
      if (edit) {
        helperModel.applyEdits([edit]);
      }
    });

    const code = helperModel.getValue();
    codeViewInstanceModel.setValue(code);
  }

  const config = {
    name: "Format Code",
    action: formatCode,
    description: "Format selected elements code",
    shortcuts: ["cmd+shift+f"],
  };

  return config;
}
