import React, { useState, useEffect } from 'react';
import { useThemeConstants } from './ThemeConstants';
import { X, RefreshCw } from 'lucide-react';

const jokesData = [
	"What does DNA stand for? National Dyslexic Association.",
    "I made a DNA joke in my biology class but no one laughed. Guess my thymine was off.",
    "How can you better understand genetics in cold weather? Put your codon!",
    "Why do biologists look forward to casual Fridays? They’re allowed to wear genes to work.",
    "What was the geneticist's favorite pick-up line? 'I wish I was adenine… Then I could get paired with U.'",
    "Which biochemicals wash up on beaches? Nucleotides.",
    "Why did the gene go to therapy? It had trouble expressing itself.",
    "When the chromosomes threw a party, it was all fun and games until someone broke a gene pool.",
    "Why did the DNA go to the party? It wanted to unwind.",
    "Genes are like bad comedians—they always need a good pair to carry them.",
    "When genes hang out together, they make great sequences.",
    "Why was the geneticist great at poker? They knew all the dominant traits.",
    "What do you call a highly educated gene? A pro-tein.",
    "Why don’t genes gossip? Because they prefer to keep everything under wraps until transcription.",
    "I asked my DNA for advice; it said, 'Stay true to yourself.'",
    "What did the DNA say to the RNA? Quit copying me!",
    "What do you call a protein that breaks things down? DJ Enzyme!",
    "Why do ants never get sick? Because they have little anty bodies.",
    "Two blood cells met and fell in love. Sadly, it was all in vein.",
    "What do biologists post on Instagram? Cell-fies.",
    "Why couldn’t the plants escape prison? Because there were walls outside their cells.",
    "Biology is the only science where multiplication is the same thing as division.",
    "Why do geneticists make terrible friends? Because they always split when things get rough.",
    "Why did the biologist become a gardener? They had a natural talent for gene-etics.",
    "Why are tertiary structures selfish? Because the amino acids are all wrapped up in themselves.",
    "What’s a geneticist’s favorite type of music? Hip-hoplotypes.",
    "Why was the scientist so bad at small talk? They didn’t have much RNA.",
    "A genetically modified tomato won the race because it was engineered to ketchup.",
    "Why was the biologist always calm? Because they knew how to stay in their gene pool.",
	"Why did the gene get promoted? It was a dominant trait!",
	"I told a pun about DNA, but it went over people’s heads—guess it lacked some Helix.",
	"What’s a DNA molecule’s favorite game? Hide and sequence!",
	"Why did the biologist break up with the physicist? No chemistry!",
	"Why are genes so talkative? They always express themselves.",
	"How do you comfort a grieving DNA strand? You tell them to stay positive in their charge.",
	"I had a joke about genes… but I forgot its sequence.",
	"What did the cytosine say to the guanine? You’re the base of my pairing!",
	"What’s a geneticist’s favorite drink? RNA-mocha latte.",
	"Why don’t geneticists get lost? They always have a gene map.",
	"Why do biologists look forward to Fridays? It’s gene editing day.",
	"Did you hear about the biologist who won the lottery? They had all the right sequences.",
	"Why was the cell so bad at socializing? It just wanted to stay in mitosis.",
	"Why did the scientist start studying genetics? They wanted to find themselves.",
	"What’s a ribosome’s favorite genre of music? Smooth RNA & B.",
	"Why was the allele so competitive? It wanted to be dominant!",
	"Why was the Punnett square so confident? It knew its outcomes were recessively cool.",
	"Why are geneticists so optimistic? They always look for positive mutations.",
	"What’s a geneticist’s favorite snack? Mendel’s peas.",
	"How do genes listen to music? They use their transcription.",
	"Why didn’t the gene go to the party? It didn’t want to replicate the fun.",
	"How do DNA strands keep warm? They wear helices.",
	"What do you call a fake gene? A pseudogene.",
	"Why do geneticists love camping? They enjoy pairing in nature.",
	"What did the strand of DNA say to its twin? Stop copying me!",
	"What’s a biologist’s favorite type of humor? Cell-f-deprecating jokes.",
	"Why don’t geneticists argue much? They’re always on the same strand.",
	"Why are enzymes such good matchmakers? They know how to catalyze great bonds.",
	"Why was the strand of DNA so good at poker? It knew all the bases.",
	"What do you call a genetics lab that’s always arguing? A hot spot for mutations.",
	"What do you call an adventurous RNA molecule? Messenger on a mission.",
	"Why did the scientist bring a ladder? To reach new heights in gene expression.",
	"What’s DNA’s favorite dance move? The double helix twist.",
	"What did one chromosome say to another? Stop crossing over into my space!",
	"Why do scientists love genes? They’re simply fascinating!",
	"Why did the protein get fired? It kept folding under pressure.",
	"What’s the favorite breed of dog for geneticists? The pure-bred.",
	"Why don’t cells ever get bored? They’re always dividing up the work.",
	"Why was the ribosome so productive? It was in its prime translation phase.",
	"Why do geneticists hate surprises? They prefer predictable outcomes.",
	"What’s a gene’s favorite kind of story? A transcription tale.",
	"Why was the DNA sad? It lost its pair.",
	"What did the RNA say at karaoke? I’m all about that base.",
	"Why are mutations so good at improvisation? They’re great at adapting.",
	"What’s a mitochondrion’s favorite food? ATP rolls.",
	"Why did the gene bring a notebook to the party? To take notes on transcription.",
	"What do you call a suspicious strand of DNA? A bit fishy.",
	"What’s a chromosome’s favorite snack? A chromo-zone bar.",
	"How do proteins apologize? They fold their mistakes into something useful.",
	"Why did the scientist fail their genetics test? They couldn’t find their locus.",
	"Why was the genome so friendly? It had a lot of repeat regions.",
	"Why do researchers always double-check? To avoid any helicase.",
	"What’s a geneticist’s favorite exercise? Jumping genes.",
	"What’s the coolest type of DNA? CRISPR clean.",
	"What do ribosomes do at parties? Translate the vibes.",
	"Why don’t chromosomes get into fights? They know how to pair up.",
	"What’s the hottest trend in biology? Sequins-ing DNA.",
	"Why are codons great at texting? They always send the right messages.",
	"Why was the scientist bad at karaoke? They couldn’t find the right sequence.",
	"What’s a gene’s favorite subject in school? Bio-logy.",
	"Why do scientists never skip lab day? They love hanging out with their cultures.",
	"What’s a geneticist’s favorite board game? Scrabble—it’s full of great sequences.",
	"Why did the DNA stand out? It had great strands.",
	"How do geneticists get clean? They use a buffer.",
	"Why was the sequence hard to work with? It was out of order.",
	"What do you call a geneticist who tells great stories? A histone teller.",
	"Why are geneticists great chefs? They can whip up a great solution.",
	"What do you call a quiet strand of DNA? Shyentist.",
	"What do geneticists and comedians have in common? They both love a good reaction.",
	"What do you get when you cross DNA with a comedian? A great transcription of laughs.",
	"Why don’t genes gamble? They don’t like taking chances.",
	"What did the scientist say to their protein? You’re my backbone.",
	"Why are RNA strands so adventurous? They’re always on the go.",
	"What’s a biologist’s favorite day of the week? FrDNA.",
	"Why did the chromosome love puzzles? It liked crossing over.",
	"What do you call an RNA molecule that tells jokes? mFunny.",
	"Why was the double helix so calm? It stayed in its loop.",
	"Why did the researcher go viral? Their humor was infectious.",
	"What’s the favorite holiday for geneticists? Gene-ral holidays.",
	"Why do DNA strands love road trips? They like unwinding.",
	"What did the protein say to the strand? Fold me closer!",
	"Why are geneticists great friends? They’re always open to pairing up.",
	"What’s a genetics professor’s favorite lesson? The twist in the double helix.",
	"Why don’t alleles like competition? It’s too dominant a topic.",
	"What do you call a nervous RNA? A shaky strand.",
	"Why did the gene refuse to play cards? It didn’t like getting shuffled.",
	"What’s a transcription factor’s motto? Keep expressing yourself.",
	"Why are scientists good singers? They know how to amplify their voices.",
	"What’s a DNA strand’s favorite fashion? A double helix scarf.",
	"Why do cells throw the best parties? They know how to divide and conquer.",
	"Why do geneticists love music? They love sequencing harmony."
  ];

  const JokeOfTheDay = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [joke, setJoke] = useState('');
	const themeConstants = useThemeConstants();
  
	const getNewJoke = () => {
	  let newJoke;
	  do {
		const randomIndex = Math.floor(Math.random() * jokesData.length);
		newJoke = jokesData[randomIndex];
	  } while (newJoke === joke && jokesData.length > 1); // Ensure we get a different joke
	  setJoke(newJoke);
	};
  
	useEffect(() => {
	  // Check if we already showed a joke today
	  const lastJokeDate = localStorage.getItem('lastJokeDate');
	  const today = new Date().toDateString();
	  
	  if (lastJokeDate !== today) {
		getNewJoke();
		setIsOpen(true);
		localStorage.setItem('lastJokeDate', today);
	  }
	}, []);
  
	if (!isOpen) return null;
  
	return (
	  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div className={`${themeConstants.sectionBackgroundColor} max-w-md w-full rounded-lg shadow-xl p-6 relative transform transition-all duration-300 scale-100 opacity-100`}>
		  <button 
			onClick={() => setIsOpen(false)}
			className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
		  >
			<X size={24} />
		  </button>
		  
		  <div className="text-center">
			<h3 className={`text-xl font-bold mb-4 ${themeConstants.headingTextColor}`}>
			  Genetics Joke of the Day
			</h3>
			<p className={`text-lg mb-6 ${themeConstants.mainTextColor}`}>
			  {joke}
			</p>
			<div className="flex justify-center space-x-4">
			  <button
				onClick={() => setIsOpen(false)}
				className={`${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white px-6 py-2 rounded-lg transition-colors duration-200`}
			  >
				Got it!
			  </button>
			  <button
				onClick={getNewJoke}
				className={`${themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.secondaryButtonHoverColor} text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center`}
			  >
				<RefreshCw size={18} className="mr-2" />
				Try Another
			  </button>
			</div>
		  </div>
		</div>
	  </div>
	);
  };
  
  export default JokeOfTheDay;