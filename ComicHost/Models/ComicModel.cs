using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ComicHost.Models
{
    public class ComicModel
    {
        public string ComicPath { get; set; }
        public string ComicTags { get; set; }

        public string SearchTags { get; set; }

        public string PermaLink { get; set; }
    }
}