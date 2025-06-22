# Wet bulb temperature visualizer

**[View it live](https://adalinesimonian.github.io/wet-bulb-vis/)**

Interactive webpage for visualizing and understanding wet bulb temperature.

## What it does

Calculates and visualizes wet bulb temperature. Wet bulb temperature is the temperature measured by a thermometer covered in a wet cloth with air flowing over it. Based on [recent research][research] from Penn State, humans can't survive prolonged exposure to wet bulb temperatures above 31°C (87.8°F).

## Running it

If you use [Volta][volta], the project will automatically use the correct [Node.js][node] and [Yarn][yarn] versions.

```bash
yarn
yarn dev
```

Then open http://localhost:1234.

You can build the project for production with:

```bash
yarn build
```

## How it works

The page uses the [Stull approximation formula][formula] for wet bulb temperature calculations. You can either:

- Input temperature and humidity to see the resulting wet bulb temperature
- Input a target wet bulb temperature to see what temperature/humidity combinations produce it

The chart shows danger zones for human health at different wet bulb temperatures.

## License

[ISC](LICENCE)

[research]: https://www.psu.edu/news/research/story/humans-cant-endure-temperatures-and-humidities-high-previously-thought
[volta]: https://volta.sh
[node]: https://nodejs.org
[yarn]: https://yarnpkg.com
[formula]: https://journals.ametsoc.org/view/journals/apme/50/11/jamc-d-11-0143.1.xml
