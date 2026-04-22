import { useHeaderHeight } from "@react-navigation/elements";

import { InboxThreadList } from "@/components/InboxThreadList";

export default function OwnerInboxScreen(): React.ReactElement {
  const headerHeight = useHeaderHeight();
  return <InboxThreadList contentTopInset={headerHeight} />;
}
