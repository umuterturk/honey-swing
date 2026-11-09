import {renderFactorInfo} from './factorInfo.jsx';
import {renderFeatureIntro} from './featureIntro.jsx';
import {renderLevelStart} from './levelStart.jsx';
import {renderLevelEnd} from './levelEnd.jsx';

// A new screen costs screens/<name>.jsx, its CSS, one line in screens/index.js, and one @import in styles/chrome.css or minimal.css. Add its primary button to skipFocusSelector in skipFocus.js when the screen has one.
export const screens=[
  renderFactorInfo,
  renderFeatureIntro,
  renderLevelStart,
  renderLevelEnd
];
