/**
 * Created by karthik on 10/29/16.
 */

 Array.prototype.unique = function () {
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

var publicationsViz;

function BarChart (options) {

    var _self = this;
    _self.data = options.data;
    _self.id = _self.id;
}

BarChart.prototype.drawHorizontalBar = function (key, top) {

}


$(document).ready(function () {

    d3.json("/assets/data/publications.json").then(data=>{

        // Empty the div
        d3.select("#publicationsViz").empty();
        d3.select("#publicationsList").empty();
        
        //create publications viz
        publicationsViz = new BarChart ({
            id: "#publicationsViz",
            data: data
        });
        
        var publicationsList = d3.select("#publicationsList").style("float", "left");

        // meta data
        var coauthors = [];
        var keywords = [];
        var journals = [];
        var conferences = [];
        var workshops = [];

        data.sort((a,b)=>{ return b.year - a.year})

        data.forEach(function (datum) {
            coauthors = coauthors.concat(datum.authors);
            keywords = keywords.concat(datum.keywords);

            if (datum.type == "Conference") {
                conferences.push(datum);
            } else if (datum.type == "Journal") {
                journals.push(datum);
            } else if (datum.type == "Workshop") {
                workshops.push(datum);
            }

        });


        coauthors = coauthors.unique();
        keywords = keywords.unique();

        // publicationsList.append("div").html("Karthik has <b>" + data.length + " peer-reviewed publications</b> with <b>" + (coauthors.length - 1) + " collaborators</b> since " + data[data.length-1].year + ".")

        // publicationsList.append("div").html("<br/>");
        // publicationsList.append("div").html('<p>First author contributions are highlighted with a <span style="background-color:#f0f0f0; border:1px solid white;">gray background.</span></p>');

        // publications
        publicationsContent = publicationsList.append("div").attr("id", "publicationsContent");

        publicationsContent.append("h3").text("Journal Papers (" + journals.length + ")");
        journals.forEach(function (paper, i) {
            showPublication(publicationsContent, paper, i);

        });

        publicationsContent.append("h3").html("Conference Papers (" + conferences.length + ")");
        conferences.forEach(function (paper, i) {
            showPublication(publicationsContent, paper, i);
        });


        publicationsContent.append("h3").html("Featured Workshop Papers (" + workshops.length + ")");
        workshops.forEach(function (paper, i) {
            showPublication(publicationsContent, paper, i);
        });
    });

});

function showPublication (publicationsContent, paper, i) {

    publicationsContent.append("div").style("float", "left").style("display", "block")
        .style("width", "100%")
        .style("class", "archive");

    var pub = publicationsContent.append("div").style("display", "flex")
        .style("justify-content", "center")
        .style("align-items", "center")
        .style("padding-left", "10px")
        .style("line-height", "1")
        .style("padding-bottom", "5px")
        .style("margin-bottom", "5px")
        .style("padding-top", "5px")
        .style("background", "white");

    pub.append("a").attr("href", paper.url).attr("target", "_blank").append("div").style("width", "120px")
        .style("height", "80px")
        .style("display", "inline-block")
        .style("border", "1.5px solid #222")
        .style("background-size", "cover")
        .style("background-repeat", "no-repeat")
        .style("vertical-align", "top")
        .style("background-image", "url(/assets/data/images/" + paper.id + ".png)")
        

    var pubInfo = pub.append("div").style("width", "calc(100% - 120px)")
        .style("height", "100%")
        .style("background", "transparent")
        .style("padding-left", "10px")
        // .style("height", "72px")
        .style("display", "inline-block");

     if ("award" in paper) {
        var award = pubInfo.append("div").style("float", "right").style("height", "auto");
        // award.append("span").html("<b>" + paper["award"].toUpperCase() + "</b>").style("font-size", "12px");
        award.append("img").attr("src", "/assets/images/badge.png").style("height", "25px").style("margin-right", "3px");
    }

    pubInfo.append("span").html(paper.title+"<br/>").style("font-size", "14px");

    var firstAuthor = false;


    paper.authors.forEach(function (author, j) {
        var mainAuthor = false;
        if (author == "Junghoon Chae") {
            author = "" + author + "";
            mainAuthor = true;
            if (j == 0)
                firstAuthor = true;
        }

        // if (j != paper.authors.length - 1) {
        //     author = author + ", ";
        // } else {
        //     author = author + "<br/>";
        // }

        pubInfo.append("span").html(function ()
        {
            return mainAuthor? "<b>" + author + "</b>" : author;
        }
        ).style("font-size", "12px")
            // .style("background-color", mainAuthor?"#f0e8ff":"transparent");

        if (j != paper.authors.length - 1) {

            if (paper.equal == "true" && j == 0) {
                pubInfo.append("span").text(" ~ ").style("font-size", "12px");
            } else {
                pubInfo.append("span").text(", ").style("font-size", "12px");
            }

        } else {
            pubInfo.append("span").html("<br/>");
        }
    });

    if (paper.equal == "true") {
        pubInfo.append("span").html("<b>" + "The first two authors contributed equally to this work." + "</b><br/>").style("font-size", "11px");
    }

    if (firstAuthor) {
        pub.style("background-color", "#f0f0f0").style("border", "2px solid #FFF");
    }

    pubInfo.append("span").html(paper.venue + ", " + paper.year +"<br/>").style("font-size", "12px");

    if (paper.pdf != "") {
        pubInfo.append("span").attr("class", "textlink").html('<a target="_blank" href="' + paper.pdf + '">[pdf]</a>').style("font-size", "12px");
    }

    if (paper.url != "") {
        pubInfo.append("span").attr("class", "textlink").html('<a target="_blank" href="' + paper.url + '">[doi]</a>').style("font-size", "12px");
    }    

    if (paper.video != "" && typeof paper.video != 'undefined') {
        pubInfo.append("span").attr("class", "textlink").html('<a target="_blank" href="' + paper.video + '">[video]</a>  ').style("font-size", "12px");
    }

     if ("award" in paper) {
        var award = pubInfo.append("div").style("float", "right").style("height", "auto");
        award.append("span").html("<b>" + paper["award"].toUpperCase() + "</b>").style("font-size", "12px").style("margin-right", "3px");
        // award.append("img").attr("src", "/assets/images/badge.png").style("height", "25px").style("margin-right", "3px");
    }

    //
    // if (paper.bibtex != "") {
    //     pubInfo.append("span").attr("class", "textlink").html('<a target="_blank" href="' + paper.bibtex + '">(bibtex)</a> ').style("font-size", "12px");
    // }

}