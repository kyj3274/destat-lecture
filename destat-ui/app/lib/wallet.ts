import { createModal } from "@rabby-wallet/rabbykit";
import { createConfig, http } from "@wagmi/core";
import { hardhat } from "@wagmi/core/chains";

export const config = createConfig({
  chains: [hardhat],
  transports: {
    [hardhat.id]: http(),
  },
});

export const rabbykit = createModal({
  wagmi: config,
});
