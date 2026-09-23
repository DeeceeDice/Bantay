import { Redirect } from 'expo-router';
import React from 'react';

/**
 * Placeholder body for the Report tab.
 *
 * The tab listener intercepts the press and pushes the report flow, so this
 * only renders if navigation reaches it some other way - in which case
 * bouncing back to the map is the right recovery.
 */
export default function ReportTabPlaceholder(): React.ReactElement {
  return <Redirect href="/(tabs)" />;
}
