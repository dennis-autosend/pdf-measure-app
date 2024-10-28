import React from 'react';

const ScaleSettings = ({ 
  onScaleSet, 
  isSettingScale, 
  setIsSettingScale, 
  scalePoints,
  disabled 
}) => {
  const [knownDistance, setKnownDistance] = React.useState('');

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

  return (
    <div className="scale-settings">
      {!isSettingScale ? (
        <button 
          onClick={handleStartScale}
          disabled={disabled}
        >
          Set Scale
        </button>
      ) : (
        <>
          <input
            type="number"
            value={knownDistance}
            onChange={(e) => setKnownDistance(e.target.value)}
            placeholder="Enter known distance"
            disabled={!scalePoints.start || !scalePoints.end}
          />
          <button 
            onClick={handleConfirmScale}
            disabled={!scalePoints.start || !scalePoints.end || !knownDistance}
          >
            Confirm Scale
          </button>
          <button onClick={handleCancel}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
};

export default ScaleSettings;
