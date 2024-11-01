import React from 'react';
import { FaRuler, FaCheck, FaTimes } from 'react-icons/fa';
import '../styles/ScaleSettings.css';

const ScaleSettings = ({ 
  onScaleSet, 
  isSettingScale, 
  setIsSettingScale, 
  scalePoints,
  disabled 
}) => {
  const [knownDistance, setKnownDistance] = React.useState('');
  const [unit, setUnit] = React.useState('ft');

  const handleStartScale = () => {
    setIsSettingScale(true);
    console.log('Scale setting started');
  };

  const handleConfirmScale = () => {
    if (scalePoints.start && scalePoints.end && knownDistance) {
      const pixelDistance = Math.sqrt(
        Math.pow(scalePoints.end.x - scalePoints.start.x, 2) + 
        Math.pow(scalePoints.end.y - scalePoints.start.y, 2)
      );
      
      const scaleFactor = parseFloat(knownDistance) / pixelDistance;
      onScaleSet(scaleFactor);
      setKnownDistance('');
    }
  };

  const handleCancel = () => {
    setIsSettingScale(false);
    setKnownDistance('');
  };

  const getStepStatus = (step) => {
    if (step === 1) return scalePoints.start ? 'complete' : isSettingScale ? 'active' : 'pending';
    if (step === 2) return scalePoints.end ? 'complete' : (scalePoints.start ? 'active' : 'pending');
    if (step === 3) return knownDistance ? 'complete' : (scalePoints.end ? 'active' : 'pending');
  };

  const getInstructionMessage = () => {
    if (!scalePoints.start) {
      return "Double-click to set the first point";
    } else if (!scalePoints.end) {
      return "Double-click to set the second point";
    }
    return "Enter the known distance between the points";
  };

  return (
    <div className="scale-settings">
      {!isSettingScale ? (
        <button 
          className="scale-start-btn"
          onClick={handleStartScale}
          disabled={disabled}
        >
          <FaRuler />
          <span>Set Scale</span>
        </button>
      ) : (
        <div className="scale-setup-container">
          <div className="scale-instruction">
            <span className="instruction-text">{getInstructionMessage()}</span>
          </div>

          <div className="scale-steps">
            <div className={`scale-step ${getStepStatus(1)}`}>
              <div className="step-number">1</div>
              <div className="step-label">Set First Point</div>
            </div>
            <div className={`scale-step ${getStepStatus(2)}`}>
              <div className="step-number">2</div>
              <div className="step-label">Set Second Point</div>
            </div>
            <div className={`scale-step ${getStepStatus(3)}`}>
              <div className="step-number">3</div>
              <div className="step-label">Enter Distance</div>
            </div>
          </div>

          <div className="scale-input-container">
            <div className="distance-input-group">
              <input
                type="number"
                value={knownDistance}
                onChange={(e) => setKnownDistance(e.target.value)}
                placeholder="Enter distance"
                disabled={!scalePoints.start || !scalePoints.end}
                className="distance-input"
              />
              <select 
                value={unit} 
                onChange={(e) => setUnit(e.target.value)}
                className="unit-select"
              >
                <option value="ft">feet</option>
                <option value="m">meters</option>
                <option value="yd">yards</option>
              </select>
            </div>

            <div className="scale-actions">
              <button 
                className="confirm-btn"
                onClick={handleConfirmScale}
                disabled={!scalePoints.start || !scalePoints.end || !knownDistance}
              >
                <FaCheck />
                <span>Confirm</span>
              </button>
              <button 
                className="cancel-btn"
                onClick={handleCancel}
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScaleSettings;
