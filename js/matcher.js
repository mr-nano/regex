var create_new_matcher = (function(){

	var is_status_true = function(token_response){
		token_response = token_response || {status : false};
		return token_response.status;
	};

	var get_string_property = function(token_response){
		return token_response.stringProperty;
	};

	var concat_hetro_to_homo_array = function(accumulator, elem){
		return accumulator.concat(elem);
	}

	var apply_rule = function(listOfStringProperties, token_function){
		var hetroArrayOfResponses = listOfStringProperties.map(token_function);
		var responses = hetroArrayOfResponses.reduce(concat_hetro_to_homo_array,[]);
		var matched_responses = responses.filter(is_status_true);
		var newListOfMatches = matched_responses.map(get_string_property);
		return newListOfMatches;
	};

	return function(properties){
		var token_functions = properties.token_functions;
		var stringProperties = {
			string : properties.string,
			stringIndex : properties.stringIndex,
			matched : properties.matched,
			get_current_character : function(){
				return this.string[this.stringIndex];
			},
			get_previous_character : function(){
				return this.string[this.stringIndex -1];
			}
		};
		var eligibleMatches = token_functions.reduce(apply_rule, [stringProperties]);
		return eligibleMatches;
	};
})();

var token_functions = (function(){

	var matched_message = function(stringProperty){
		return {
			status : true,
			stringProperty : stringProperty
		};
	}

	var is_line_starter = function(string){
		return (string === undefined || string === "");
	};

	var if_matches_then_incr_append_and_return = function(stringProperty,expectedMatch,stringPraser,stringIndex){
		var stringPraser = stringPraser || function(string){ return string};
		var parsedInput = stringPraser(stringProperty.get_current_character());
		if(parsedInput === expectedMatch){
			stringProperty.matched += expectedMatch;
			stringProperty.stringIndex += 1;
			return matched_message(stringProperty);
		}
		return ;
	};

	var create_matcher_properties = function(token_functions, stringProperty){
		return {
			token_functions : token_functions,
			string : stringProperty.string,
			stringIndex : stringProperty.stringIndex,
			matched : stringProperty.matched
		};
	};

	var convert_positive_matcher_response_to_token_response = function(matcherResponses){
		return matcherResponses.map(function(response){
			return {
				status : true,
				stringProperty : response
			};
		})
	}


	return {
		alpha : function(character){

			var characterToMatch = character;

			return function(stringProperty){
				return if_matches_then_incr_append_and_return(stringProperty,characterToMatch);
			};
		},
		digit : function(number){
			var numberToMatch = number;

			return function(stringProperty){
				return if_matches_then_incr_append_and_return(stringProperty, numberToMatch, 
					function(string) { 
					return parseInt(string)
					});
				};
		},
		anything : function(stringProperty){
			return if_matches_then_incr_append_and_return(stringProperty,stringProperty.string[stringProperty.stringIndex]);
		},
		start : function(stringProperty){
			if(is_line_starter(stringProperty.get_previous_character())){
				return matched_message(stringProperty);
			}
			return ;
		},
		end : function(stringProperty){
			if(!stringProperty.get_current_character()){
				return matched_message(stringProperty);
			}
			return ;
		},
		question : function(token_function){
			var token_function = token_function;

			return function(stringProperty){

				var matcherProperties = create_matcher_properties([token_function],stringProperty);

				var matcherResponses = create_new_matcher(matcherProperties);

				matcherResponses = convert_positive_matcher_response_to_token_response(matcherResponses);

				matcherResponses.push(matched_message(stringProperty));

				return matcherResponses;
			};
		},
		star : function(token_function,shouldPushNoMatch){
			var token_function = token_function;
			var shouldPushNoMatch = shouldPushNoMatch === undefined ? true : shouldPushNoMatch;

			return function(stringProperty){
				
				var matcherProperties = create_matcher_properties([token_function],stringProperty);

				var matcherResponses = create_new_matcher(matcherProperties);

				var moreResponses =  matcherResponses.map(function(response){
					return create_new_matcher(create_matcher_properties([token_functions.star(token_function,false)],response));
				});

				moreResponses = moreResponses.reduce(function(accumulator,elem){
					return accumulator.concat(elem);
				},[]);

				var allResponses = matcherResponses.concat(moreResponses);

				allResponses = convert_positive_matcher_response_to_token_response(allResponses);

				if(shouldPushNoMatch){
					allResponses.push(matched_message(stringProperty));	
				};

				return allResponses;
			}
		}
	};
})();

var tokenize = function(regex){
	return [
		token_functions.start,
		token_functions.alpha('d'),
		token_functions.alpha('h'),
		token_functions.alpha('r'),
		token_functions.alpha('u'),
		token_functions.star(token_functions.alpha('v')),
		// token_functions.end,
	];
}

var start_match = function(properties){

	var token_functions = properties.tokens || tokenize(properties.regex);

	var matcherProperties = {
		token_functions : token_functions,
		string : properties.string,
		stringIndex : properties.stringIndex || 0,
		matched : properties.matched || ""
	};

	var matcherResponses = create_new_matcher(matcherProperties);
	return matcherResponses.map(function(elem){
		return elem.matched;
	});
};

$(document).ready(function(){
	var submit = $('#submit');

	submit.click(function(event){
		event.preventDefault();
		var regex = $('#regex')[0].value || "";
		var string = $('#string')[0].value || "";
		var matched = start_match({
			string : string,
			regex : regex
		});
		console.log("Matched string: " + matched);
	});
});