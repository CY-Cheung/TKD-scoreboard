import './ScoreBoard.css'

function ScoreBoard() {

  return (
    <div className="scoreboard center">
        <div className="scoreboard-header center">
            <div className="red-name name center red-bg">Red Player</div>
            <div className="blue-name name center blue-bg">Blue Player</div>
        </div>
        <div className="scoreboard-content center">
            <div className="red-info info center">
                <div className="row">
                    <div className="red-log log center red-bg"></div>
                    <div className="red-score score center">0</div>
                </div>
                <div className="red-gamjeom gamjeom center red-bg"></div>
            </div>
            <div className="match-info">
                <p>MATCH</p>
                <p>A1001</p>
            </div>
            <div className="blue-info info center">
                <div className="row">
                    <div className="blue-score score center">0</div>
                    <div className="blue-log log center blue-bg"></div>
                </div>
                <div className="blue-gamjeom gamjeom center blue-bg"></div>
            </div>
        </div>
    </div>
  )
}

export default ScoreBoard