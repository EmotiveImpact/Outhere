// Step 1 of 4: consent. One clear tick, stored with the time.

import React, { useState } from "react";
import { useRouter } from "expo-router";
import { engine, useEngineMutation } from "@/data/hooks";
import { PACK_SAMPLES } from "@/constants/photos";
import { PackButton, PackScreen, PackTitle, Points, Spacer, TickBox } from "@/components/pack/PackKit";

export default function PackConsent() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const consent = useEngineMutation(engine.recordPackConsent, { onSuccess: () => router.replace("/pack/ready") });
  return (
    <PackScreen step={1} stepLabel="Consent" bg={PACK_SAMPLES.stride}>
      <Spacer />
      <PackTitle top="Your face." em="Your pack." />
      <Points
        items={[
          "A quick face scan, taken now in the app. No camera roll.",
          "Selfies are deleted within 24 hours. Never used to train anything.",
          "Only you can be in your pack. Anyone can report one that isn't.",
          "Delete the whole pack any time in Settings.",
        ]}
      />
      <TickBox value={agreed} onChange={setAgreed}>
        I'm 18 or over and these photos are of me.
      </TickBox>
      <PackButton title="Start face scan" disabled={!agreed} loading={consent.isPending} onPress={() => consent.mutate({ ageConfirmed: true })} />
    </PackScreen>
  );
}
