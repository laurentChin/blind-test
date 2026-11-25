import figma from "@figma/code-connect";
import Icon from "./Icon";

// Figma has one component per icon; the code has one component for all of them,
// the icon being the `name` prop. So every icon node maps onto the same
// component with its own name, and Dev Mode shows `<Icon name="…" />` on each.
const ICON_NODES = {
  add: "2034-29459",
  check: "200-9081",
  "chevron-left": "200-9092",
  "chevron-right": "221-16867",
  close: "200-9088",
  pause: "2372-98417",
  play: "2392-39533",
  search: "297-22493",
  settings: "245-33936",
  share: "2006-25285",
  skip: "2372-98425",
  warning: "297-22637",
} as const;

const FILE_URL =
  "https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final";

Object.entries(ICON_NODES).forEach(([name, nodeId]) => {
  figma.connect(Icon, `${FILE_URL}?node-id=${nodeId}`, {
    // The node carries no variant: the icon is the whole component, and the
    // size comes from the component that hosts it.
    example: () => <Icon name={name as keyof typeof ICON_NODES} />,
  });
});
