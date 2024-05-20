import useRnbw from "@_services/useRnbw";
import { Range, editor } from "monaco-editor";
import { useElementHelper } from "@_services/useElementHelper";

// helperModel added to update the code in the codeViewInstanceModel
// once when the action is executed, this improves the History Management
const helperModel = editor.createModel("", "html");

export default function useTurnInto() {
  const rnbw = useRnbw();
  const { PrettyCode } = useElementHelper();
  const selectedElements = rnbw.elements.getSelectedElements();

  async function turnInto(tagName: string) {
    const codeViewInstanceModel = rnbw.files.getEditorRef().current?.getModel();
    if (!codeViewInstanceModel) return;
    helperModel.setValue(codeViewInstanceModel.getValue());

    for (const uid of selectedElements) {
      const node = rnbw.elements.getElement(uid);
      if (!node) return;
      const nodeAttribute = rnbw.elements.getElementSettings(uid);

      // Getting existing tag attributes
      const attributeCode = Object.entries(nodeAttribute)
        .map(([attrName, attrValue]) => `${attrName}="${attrValue}"`)
        .join(" ");

      const { startTag, endTag, startLine, startCol, endLine, endCol } =
        node.data.sourceCodeLocation;
      if (!startTag || !endTag) return;
      const innerCode = codeViewInstanceModel.getValueInRange(
        new Range(
          startTag.endLine,
          startTag.endCol,
          endTag.startLine,
          endTag.startCol,
        ),
      );
      const newCode = `<${tagName} ${attributeCode}>${innerCode}</${tagName}>`;

      const formattedCode = await PrettyCode(newCode, startCol);

      const edit = {
        range: new Range(startLine, startCol, endLine, endCol),
        text: formattedCode,
      };
      helperModel.applyEdits([edit]);
    }
    const code = helperModel.getValue();
    codeViewInstanceModel.setValue(code);
  }

  const config = {
    name: "Turn Into",
    action: turnInto,
    description: "Turn selected elements into a new tag",
    shortcuts: ["cmd+shift+t"],
  };

  return config;
}
