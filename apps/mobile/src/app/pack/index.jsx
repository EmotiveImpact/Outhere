// The Fighter Pack's front door. Sends you to the step you're on: consent,
// the face scan, the verified screen, the pictures being made, or your pack.
// Free members see what the pack is and how to get it; under 18s never get
// past this screen.

import React from "react";
import { Redirect, useRouter } from "expo-router";
import { usePackCredits, usePackState } from "@/data/hooks";
import { ErrorState, Skeleton } from "@/components/ui";
import { SLOTS } from "@/constants/pack";
import { PACK_SAMPLES } from "@/constants/photos";
import { LockLine, PackButton, PackScreen, PackTitle, Points, Spacer, Sub } from "@/components/pack/PackKit";

export default function PackHome() {
  const router = useRouter();
  const stateQ = usePackState();
  const creditsQ = usePackCredits();
  const state = stateQ.data;
  const credits = creditsQ.data;

  if (stateQ.error || creditsQ.error) {
    return (
      <PackScreen>
        <ErrorState what="your Fighter Pack" body={(stateQ.error || creditsQ.error)?.message} bleed={false} onRetry={() => (stateQ.refetch(), creditsQ.refetch())} retrying={stateQ.isFetching || creditsQ.isFetching} />
      </PackScreen>
    );
  }

  if (!state || !credits) {
    return (
      <PackScreen>
        <Spacer />
        <Skeleton height={120} radius={18} />
        <Skeleton height={54} radius={16} />
      </PackScreen>
    );
  }

  if (!state.age.known || !state.age.adult) {
    return (
      <PackScreen bg={PACK_SAMPLES.stride} bgOpacity={0.5}>
        <Spacer />
        <PackTitle top="For 18" em="and over" />
        <Sub>{state.age.known ? "The Fighter Pack is for members aged 18 and over. Your silhouette stands in for you until then." : "Add your date of birth first. The Fighter Pack is for members aged 18 and over."}</Sub>
        {state.age.known ? null : <PackButton title="Add date of birth" onPress={() => router.replace("/settings/profile")} />}
      </PackScreen>
    );
  }

  if (credits.locked) {
    return (
      <PackScreen bg={PACK_SAMPLES.win} bgFocus={0.15}>
        <Spacer />
        <PackTitle top="Your own" em="Fighter Pack" />
        <Points
          items={[
            `${SLOTS.length} pictures of you, made from a quick face scan.`,
            "Your side of every 1v1, your results card and your profile.",
            "Pro gets one pose each for race, win and respect. Black gets four of each.",
          ]}
        />
        <PackButton title="Get it with Pro" onPress={() => router.push("/membership")} />
        <LockLine>Free members keep their photo or silhouette</LockLine>
      </PackScreen>
    );
  }

  if (state.status === "making") return <Redirect href="/pack/making" />;
  if (state.status === "ready") return <Redirect href="/pack/review" />;
  if (state.verifiedAt) return <Redirect href="/pack/verified" />;
  if (state.consentedAt) return <Redirect href="/pack/ready" />;
  return <Redirect href="/pack/consent" />;
}
