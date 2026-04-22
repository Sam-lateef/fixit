import { InboxThreadList } from "@/components/InboxThreadList";
import { ShopPremiumGate } from "@/components/ShopPremiumGate";

export default function ShopInboxScreen(): React.ReactElement {
  return (
    <ShopPremiumGate>
      <InboxThreadList />
    </ShopPremiumGate>
  );
}
