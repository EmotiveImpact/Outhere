import React from 'react';
import { RefreshControl as WebRefreshControl } from 'react-native-web-refresh-control';

// On a phone progressViewOffset only moves the spinner down below floating
// controls. The web library turns it into top padding on the whole list,
// which pushed every screen that sets it 74px lower than the prototype, so
// the web build leaves it out.
export default function RefreshControl({ progressViewOffset, ...props }: any) {
  return <WebRefreshControl {...props} />;
}
