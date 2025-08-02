import './ScoreBoard.css'

function ScoreBoard() {

  return (
    <div className="scoreboard">
        <div className="top">
            <div className="red-name red-bg"></div>
            <div className="blue-name blue-bg"></div>
        </div>
        <div className="midbottom">
            <div className="red-log red-bg">
                <div className="red-ref-log red-bg"></div>
                <div className="red-gamjeom red-bg"></div>
            </div>
            <div className="red-score red-bg">
                <div className="red-score-text red-score-bg"></div>
                <div className="red-score-info red-bg"></div>
            </div>
            <div className="match-info">
                <div></div>
                <div></div>
                <div></div>
            </div>
            <div className="blue-score blue-bg">
                <div className="blue-score-text blue-score-bg"></div>
                <div className="blue-score-info blue-bg"></div>
            </div>
            <div className="blue-log blue-bg">
                <div className="blue-ref-log blue-bg"></div>
                <div className="blue-gamjeom blue-bg"></div>
            </div>
        </div>
    </div>
  )
}

export default ScoreBoard