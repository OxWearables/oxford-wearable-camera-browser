
var _request_pending = false;
function create_query(url, data) {
	console.log("create_query", url, data)
	if (_request_pending==true) 
		return Promise.reject("already waiting for a request to complete");
 	_request_pending = true;
	// url += "error time"
	return $.post(url, data)
		.done((response) => {
			console.log("POST success, data = ", response)
			return response;
		})
		.fail((err) => {
			console.log("POST error url = ", url, err)
			return err;
		})
		.always(() => {
			_request_pending = false;
		}) 
}
var Event = {
	// participant_id not really necessary here, but can't hurt
	check_valid: function(participant_id) {
		return create_query("/participant/"+participant_id+"/check_valid",undefined)
	},
	add_image: function(participant_id, event_id, image_id) {
		return create_query("/participant/"+participant_id+"/"+event_id+"/"+image_id+"/add_image",undefined)
			.then(Image.intercept_imgs)
	},
	remove_image: function(participant_id, event_id, image_id, direction, include_target) {
		return create_query(
			"/participant/"+participant_id+"/"+event_id+"/"+image_id+"/remove",
			{direction:direction, include_target:include_target})
			.then(Image.intercept_imgs)
	},
	split: function(dir, participant_id, event_id, image_id) {
		if (dir=="left" || dir=="right") 
			return create_query("/participant/"+participant_id+"/"+event_id+"/"+image_id+"/split_"+dir,undefined)
			.then(Image.intercept_imgs)
	},
	annotate_image: function(participant_id, image_id, label_id) {
		return create_query("/participant/"+participant_id+"/"+image_id+"/annotate_image",{label_id:label_id})
					.then(Image.intercept_imgs)
	},	
	annotate: function(participant_id, event_id, label_id) {
		return create_query("/participant/"+participant_id+"/"+event_id+"/annotate",{label_id:label_id})
					.then(Image.intercept_imgs)
	},
	annotate_and_set_color: function(participant_id, event_id, label_id, color) {
		return create_query("/participant/"+participant_id+"/"+event_id+"/annotate",{label_id:label_id, color:color})
					.then(Image.intercept_imgs)
	}
}
var Study = {
	remove_participant: function(participant_id, study_id) {
		return create_query("/remove_studyparticipant",{participant_id: participant_id, study_id:study_id})
	},
	remove_user: function(user_id, study_id) {
		return create_query("/user/"+user_id+"/modify_studies",{study_id:study_id, method: "remove"})
	},
	get_annotation_csv: function(participant_id, complte) {
		window.location = "/participant/"+participant_id+"/download_annotation"
	}
}
var User = {
	change_password: function(user_id, old_password, new_password) {
		return create_query("/user/"+user_id+"/change_password",{original_password: original_password, new_password:new_password})
	}
}
var Image = {
	load_by_id: function(participant_id, start, end, num) {
		return create_query("/participant/"+participant_id+"/load_images", {start_id:start, end_id:end, number:num})
			.then(Image.intercept_imgs)
	},
	intercept_imgs: function(data) {
		if (data.images) data.images.forEach(Image.new_img)
		console.log("loaded_imgs", data)
		return data
	},
	new_img: function (img) {
		img.needs_update=true; // set needs_update to true
		// convert time to Date (not possible to send in JSON)
		if ("image_time" in img) img.image_time = new Date(img.image_time); 
	}
}
var Participant = {
	select_schema: function(participant_id, schema_id) {
		return $.post("/participant/"+participant_id+"/select_schema/"+schema_id, null);
	}
}
	// reload_by_id: function(participant_id, image_id_list) {
	// 	create_query("/participant/"+participant_id+"/load_images", {image_id_list:image_id_list})
	// }
var Datapoints = {
	get_datatypes: function(participant_id) {
		return $.post("/participant/"+participant_id+"/load_datatypes", null);
		// create_query("/participant/"+participant_id+"/load_images", {})
	},
	get_datapoints: function(participant_id, datatype_id) {
		return $.post("/participant/"+participant_id+"/load_datapoints/"+datatype_id, null);
		// create_query("/participant/"+participant_id+"/load_images", {})
	}
}