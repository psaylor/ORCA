$(function() {
	console.log("Trying to read the north wind");
	$.get("the_north_wind.xml", function (xml_data) {
		// xml_data is an XML Document parsed from the file
		var $xml_data = $(xml_data);
		console.log("Reading the north wind xml", xml_data);
		var title = $xml_data.find("title").text();
		title = $.trim(title);
		var content = $xml_data.find("content").text();
		content = $.trim(content).split(/\n/);
		console.log(title, content);
		prepareReadableDisplay({title: title, content: content});
	});

	var prepareReadableDisplay = function (readable) {
		// expects readable {title: 't', content: ['c', 'o']}
		var title = readable.title;
		var content = readable.content;
		console.log("Preparing ", title, content);

		var titleNode = $('<h3>', {id: 'title', text: title});
		$('h1').after(titleNode);

		var listGroup = $("#readable-content-list");

		for (var i = 0; i < content.length; i++) {
			var line = content[i];
			var listItemNode = $('<li>').addClass('list-group-item');

			var recordButton = $('<div type="button" class="btn btn-primary">\
				<span class="glyphicon glyphicon-record" aria-hidden="true"></span>\
				Record sentence</div>').attr('id', 'rec-btn-'+i);
			recordButton.data("text", line);
			var buttonGroup = $('<div class="btn-group" role="group"></div>');
			listItemNode.prepend(recordButton);
			

			var phrases = line.split(' ');
			for (var j = 0; j < phrases.length; j++) {
				var id = 'word-btn-' + i + '-' + j;
				var button = $('<div type="button">').attr('id', id)
					.addClass("btn").addClass("btn-default").text(phrases[j]);
				button.click( function (e) {
					var metadata = {word: phrases[j], fragment: i, index: j, type: 'playback-request'};
					console.log("Clicked word button: ", metadata);
					client.createStream(metadata);
				});
				buttonGroup.append(button);
			}
			listItemNode.append(buttonGroup);
			listGroup.append(listItemNode);
		}
	}
	
});