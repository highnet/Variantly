/* r · Kinetic Type: the word in seven editions, one width and weight per row,
   ticking along on the beat (rows alternate direction; see concept.css). */
const ROWS = 7;
const WORDS = [0, 1, 2, 3, 4, 5];

const Rows = () => (
  <div className="vy-r-rows absolute inset-x-0 -inset-y-[2vh] overflow-hidden">
    {Array.from({ length: ROWS }, (_, r) => (
      <div key={r} className="vy-r-row">
        {WORDS.map((w) => (
          <span key={w}>variantly</span>
        ))}
      </div>
    ))}
  </div>
);

export default Rows;
