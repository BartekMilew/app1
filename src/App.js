import React from 'react';
import IframeView from './IframeView';
import PopupView from './PopupView';
import { isPopupMode } from './lib/store';

export default function App() {
  return isPopupMode() ? <PopupView /> : <IframeView />;
}
