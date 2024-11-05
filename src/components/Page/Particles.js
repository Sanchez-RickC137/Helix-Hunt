import Particles, { initParticlesEngine } from "@tsparticles/react";
import { useEffect, useMemo } from "react";
// import DNA1 from "../images/DNA1.jpg";
// import DNA2 from "../images/DNA2.jpg";
// import DNA3 from "../images/DNA3.jpg";
// import DNA4 from "../../images/DNA4.png";
// import DNA5 from "../../images/DNA5.png";
import DNA6 from "../../images/DNA6.png";
import DNA7 from "../../images/DNA7.png";
import DNA8 from "../../images/DNA8.png";
import { loadSlim } from "@tsparticles/slim";

const ParticlesComponent = (props) => {
  // const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      // setInit(true);
    });
  }, []);

  const particlesLoaded = (container) => {
    console.log(container);
  };

  const options = useMemo(
    () => ({
      fullScreen: {
        zIndex: -1
      },
      particles: {
        color: {
          value: [
            "#FFFFFF",
            "#FFd700"
          ]
        },
        move: {
          direction: "bottom",
          enable: true,
          outModes: {
            default: "out"
          },
          size: true,
          speed: {
            min: 1,
            max: 3
          }
        },
        number: {
          value: 15, // Was 24
          density: {
            enable: true,
            area: 1000
          }
        },
        opacity: {
          value: 1,
          animation: {
            enable: false,
            startValue: "max",
            destroy: "min",
            speed: 0.3,
            sync: true
          }
        },
        rotate: {
          value: {
            min: 0,
            max: 180
          },
          direction: "random",
          move: true,
          animation: {
            enable: true,
            speed: 5
          }
        },
        tilt: {
          direction: "random",
          enable: true,
          move: true,
          value: {
            min: 0,
            max: 360
          },
          animation: {
            enable: true,
            speed: 60
          }
        },
        shape: {
          type: "image",
          options: {
            image: [
              {
                src: DNA8,
                width: 32, // Adjust to picture
                height: 10, // Adjust to picture
                particles: {
                  size: {
                    value: 75*2
                  }
                }
              },
              {
                src: DNA7,
                width: 32, // Adjust to picture
                height: 16, // Adjust to picture
                particles: {
                  size: {
                    value: 75*2
                  }
                }
              },
              {
                src: DNA6,
                width: 16, // Adjust to picture
                height: 32, // Adjust to picture
                particles: {
                  size: {
                    value: 35*2
                  }
                }
              },
              ]
          }
        },
        size: {
          value: {
            min: 1,
            max: 10
          }
        },
        roll: {
          darken: {
            enable: true,
            value: 30
          },
          enlighten: {
            enable: true,
            value: 30
          },
          enable: true,
          speed: {
            min: 15,
            max: 25
          }
        },
        wobble: {
          distance: 30,
          enable: true,
          move: true,
          speed: {
            min: -15,
            max: 15
          }
        }
      }
    }), []);

  return (<Particles id={props.id} init={particlesLoaded} options={options} />);
}

export default ParticlesComponent;