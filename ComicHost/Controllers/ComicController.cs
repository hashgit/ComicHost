using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Mvc;
using ComicHost.Models;

namespace ComicHost.Controllers
{
    public class ComicController : Controller
    {
        private readonly int _tnHeight;
        private readonly int _tnWidth;
        private readonly int _topCount;

        public ComicController()
        {
            _tnHeight = Convert.ToInt32(ConfigurationManager.AppSettings["ThumbnailHeight"]);
            _tnWidth = Convert.ToInt32(ConfigurationManager.AppSettings["ThumbnailWidth"]);
            _topCount = Convert.ToInt32(ConfigurationManager.AppSettings["TopCount"]);
        }

        [HttpGet]
        public ActionResult Index(string id, string tags)
        {
            if (string.IsNullOrEmpty(id))
                return View();

            Guid imgGuid;
            if (!Guid.TryParse(id, out imgGuid))
                return View();

            ViewBag.Title = Utils.Utils.Title;
            var model = DbAccess.GetComic(imgGuid);
            model.PermaLink = string.Format("http://{0}/comic/usercontent/{1}/{2}/",
                Utils.Utils.DomainName, id,
                string.Join("-", model.ComicTags.Split(new[] {", "}, StringSplitOptions.RemoveEmptyEntries)));

            return View(model);
        }

        [HttpGet]
        public ActionResult UserContent(string id, string tags)
        {
            if (string.IsNullOrEmpty(id))
                return Index(null, null);

            var p = ConfigurationManager.AppSettings["ComicSavePath"];
            var imageName = (p == "temp" ? Path.GetTempPath() : Server.MapPath(p)) + id + ".jpeg";
            return File(imageName, "image/jpeg");
        }

        [HttpGet]
        public JsonResult MostUsed()
        {
            var di = new DirectoryInfo(Server.MapPath("/images/comics/"));
            var files = di.GetFiles("*");

            return Json(files.Select(f => f.Name), JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult AddImage(string imgurl)
        {
            var httpWebRequest = (HttpWebRequest) HttpWebRequest.Create(imgurl);
            var httpWebReponse = (HttpWebResponse) httpWebRequest.GetResponse();
            var image = Image.FromStream(httpWebReponse.GetResponseStream());
            var imageName = Guid.NewGuid() + ".jpg";
            var imagePath = Path.Combine(Server.MapPath("/images/comics/"), imageName);

            image.Save(imagePath, ImageFormat.Jpeg);
            httpWebReponse.Close();
            return Json("/images/comics/" + imageName);
        }

        [HttpGet]
        public ActionResult Thumbnail(string id)
        {
            if (string.IsNullOrEmpty(id))
                return Index(null, null);

            var p = ConfigurationManager.AppSettings["ComicSavePath"];
            var imageName = (p == "temp" ? Path.GetTempPath() : Server.MapPath(p)) + id + ".jpeg";

            var stream = new MemoryStream();
            Image.FromFile(imageName).GetThumbnailImage(_tnWidth, _tnHeight, () => false, IntPtr.Zero)
                .Save(stream, ImageFormat.Jpeg);
            stream.Position = 0;
            return File(stream, "image/jpeg");
        }

        [HttpPost]
        public JsonResult Search(string tags)
        {
            if (tags == null) tags = string.Empty;

            var taglist = tags.Split(new[] {','}, StringSplitOptions.RemoveEmptyEntries);
            var comicDs = DbAccess.GetComicsByTagList(taglist, _topCount);

            var comics = new List<object>();

            foreach (DataRow row in comicDs.Tables[0].Rows)
            {
                comics.Add(new ComicModel
                               {
                                   ComicPath = Convert.ToString(row["comicid"])
                               });
            }

            return Json(comics, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public JsonResult Complete(string term)
        {
            var tagsDs = DbAccess.GetTagsList(term);
            return Json(tagsDs.Tables[0].AsEnumerable().Select(r => r["tagname"].ToString()), JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public JsonResult Create(string img, string tags)
        {
            var re = new Regex("data:image/(png|jpeg);base64,(.*)$", RegexOptions.Compiled);
            var result = re.Match(img).Groups[2];
            var imageGuid = Guid.NewGuid();

            if (result != null && result.Length > 0)
            {
                var bytes = new MemoryStream(Convert.FromBase64String(result.Value));
                var image = Image.FromStream(bytes);
                const int extraImageSize = 20;
                var newImage = new Bitmap(image.Width, image.Height + extraImageSize);

                var gr = Graphics.FromImage(newImage);
                gr.Clear(Color.White);
                gr.DrawImageUnscaled(image, 0, 0);
                gr.DrawString(ConfigurationManager.AppSettings["ImageAdPart"], SystemFonts.DefaultFont, Brushes.Black,
                              new RectangleF(0, image.Height, image.Width, extraImageSize));

                var p = ConfigurationManager.AppSettings["ComicSavePath"];
                var imageName = (p == "temp" ? Path.GetTempPath() : Server.MapPath(p)) + imageGuid + ".jpeg";

                newImage.Save(imageName, ImageFormat.Jpeg);
                DbAccess.AddComic(imageGuid, tags);
            }

            return Json(new { id = imageGuid.ToString() }, JsonRequestBehavior.AllowGet);
        }
    }
}
