using System.Web.Mvc;
using System.Web.Routing;

namespace ComicHost.App_Start
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}/{tags}",
                defaults: new { controller = "Comic", action = "Index", tags = UrlParameter.Optional, id = UrlParameter.Optional }
            );
        }
    }
}